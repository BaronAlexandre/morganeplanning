import React, { useState } from 'react';
import { Button, Image, View, StyleSheet, Text, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';

const App = () => {
  const [image, setImage] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const imagePath = result.assets[0].uri;
      setImage(imagePath);

      try {
        const ocrResult = await TextRecognition.recognize(imagePath);
        processText(ocrResult.blocks.map((block) => block.text));
      } catch (error) {
        console.error('OCR Error:', error.message);
      }
    }
  };

  const isConsecutive = (date1: Date, date2: Date): boolean => {
    const delta = date2.getTime() - date1.getTime();
    return delta === 24 * 60 * 60 * 1000; // Difference of 1 day
  };

  const extractConsecutiveDates = (lines: string[]): Date[] => {
    const dates: Date[] = [];
    let lastDate: Date | null = null;

    lines.forEach((line) => {
      try {
        const date = new Date(
          new Date().getFullYear(),
          parseInt(line.split('/')[1]) - 1,
          parseInt(line.split('/')[0])
        );

        if (!lastDate || isConsecutive(lastDate, date)) {
          dates.push(date);
          lastDate = date;
        } else {
          lastDate = null; // Reset if the date is not consecutive
        }
      } catch {
        // Ignore invalid dates
      }
    });

    return dates;
  };

  const processText = (lines: string[]) => {
    const daysPattern = /(LUN|MAR|MER|JEU|VEN|SAM|DIM)/gi;
    const vacationPattern = /(r(\.)?h)|((r|p)cdj)/i;

    const days: string[] = [];
    const datesConsecutive = extractConsecutiveDates(lines);
    const rescanActions: string[] = [];

    let startIndexRescan = -1;

    // Parse lines
    lines.forEach((line, index) => {
      const dayMatches = line.match(daysPattern);
      if (dayMatches) {
        days.push(...dayMatches);
      }

      if (line.includes('Rescan Morgane') && startIndexRescan === -1) {
        startIndexRescan = index + 2;
      }
    });

    if (startIndexRescan !== -1) {
      for (let i = startIndexRescan; i < lines.length; i++) {
        if (lines[i].includes('Inf.s.gene')) {
          startIndexRescan = i + 1;
          break;
        }
      }

      rescanActions.push(
        ...lines.slice(startIndexRescan, startIndexRescan + days.length).map((line) => line.trim())
      );
    }

    const resultMessages = rescanActions.map((action) =>
      vacationPattern.test(action) ? 'Morgane ne travaille pas' : 'Morgane travaille'
    );

    if (datesConsecutive.length === days.length && days.length === resultMessages.length) {
      const finalResults = datesConsecutive.map(
        (date, index) => `${date.toLocaleDateString('fr-FR')} (${days[index]}): ${resultMessages[index]}`
      );
      setResults(finalResults);
    } else {
      setResults(['Erreur: le nombre de dates, jours et actions ne correspond pas.']);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Pick an image from camera roll" onPress={pickImage} />
      {image && <Image source={{ uri: image }} style={styles.image} />}
      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  image: {
    width: 200,
    height: 200,
    marginVertical: 20,
  },
  resultsContainer: {
    marginTop: 20,
    width: '100%',
  },
  resultText: {
    fontSize: 16,
    marginVertical: 5,
  },
});

export default App;
